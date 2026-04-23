// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

/// Managed handle to the Python backend child process.
/// Wrapped in a Mutex<Option<Child>> so we can kill it cleanly on exit.
struct Backend(Mutex<Option<Child>>);

/// Find the repository root. In dev `cargo run` runs from `app/src-tauri`,
/// so go up two levels. Packaged builds can override the defaults with
/// `ZWORK_ROOT` and `ZWORK_PYTHON`.
fn find_repo_root() -> Option<PathBuf> {
    // 1) Env override
    if let Ok(p) = std::env::var("ZWORK_ROOT") {
        let p = PathBuf::from(p);
        if p.join("sidecar").is_dir() {
            return Some(p);
        }
    }
    // 2) Walk up from the current exe's directory
    if let Ok(exe) = std::env::current_exe() {
        let mut cur = exe.parent().map(|p| p.to_path_buf());
        while let Some(dir) = cur {
            if dir.join("sidecar").is_dir() && dir.join(".venv").is_dir() {
                return Some(dir);
            }
            cur = dir.parent().map(|p| p.to_path_buf());
        }
    }
    // 3) CWD walk-up (useful when launched from a shell)
    if let Ok(cwd) = std::env::current_dir() {
        let mut cur: Option<PathBuf> = Some(cwd);
        while let Some(dir) = cur {
            if dir.join("sidecar").is_dir() && dir.join(".venv").is_dir() {
                return Some(dir);
            }
            cur = dir.parent().map(|p| p.to_path_buf());
        }
    }
    // 4) Fallback: ~/zwork
    if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home).join("zwork");
        if p.join("sidecar").is_dir() {
            return Some(p);
        }
    }
    None
}

fn log_path() -> PathBuf {
    let mut base = std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/tmp"));
    base.push(".zwork");
    let _ = std::fs::create_dir_all(&base);
    base.push("backend.log");
    base
}

fn python_executable(root: &PathBuf) -> PathBuf {
    // Allow packaged builds to point at a bundled interpreter instead of the
    // repo-local .venv. This keeps developer and release launch paths separate.
    if let Ok(value) = std::env::var("ZWORK_PYTHON") {
        return PathBuf::from(value);
    }

    let python = root.join(".venv").join("bin").join("python3");
    if python.exists() {
        return python;
    }

    let python = root.join(".venv").join("bin").join("python");
    if python.exists() {
        return python;
    }

    PathBuf::from("python3")
}

fn append_log(msg: &str) {
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path())
    {
        let _ = writeln!(f, "[{}] {}", chrono_like_timestamp(), msg);
    }
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}", secs)
}

fn spawn_backend() -> Option<Child> {
    let root = match find_repo_root() {
        Some(r) => r,
        None => {
            append_log("find_repo_root() returned None — backend not started.");
            return None;
        }
    };
    let python_exe = python_executable(&root);

    // Write stdout/stderr to a log file so we can diagnose launch issues.
    let log = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path())
        .ok();

    let mut cmd = Command::new(&python_exe);
    cmd.current_dir(&root)
        .arg("-m")
        .arg("sidecar.server")
        .env("PYTHONUNBUFFERED", "1");
    if let Some(f) = log {
        if let Ok(f2) = f.try_clone() {
            cmd.stdout(Stdio::from(f));
            cmd.stderr(Stdio::from(f2));
        }
    } else {
        cmd.stdout(Stdio::null()).stderr(Stdio::null());
    }

    append_log(&format!(
        "Spawning backend: python={} root={}",
        python_exe.display(),
        root.display()
    ));

    match cmd.spawn() {
        Ok(child) => {
            append_log(&format!("Backend spawned pid={}", child.id()));
            Some(child)
        }
        Err(err) => {
            append_log(&format!("Spawn failed: {err}"));
            None
        }
    }
}

fn main() {
    let backend_child = spawn_backend();

    let app = tauri::Builder::default()
        .manage(Backend(Mutex::new(backend_child)))
        .build(tauri::generate_context!())
        .expect("error while building zWork");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
            if let Some(backend) = app_handle.try_state::<Backend>() {
                if let Ok(mut guard) = backend.0.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                        eprintln!("[zwork] backend stopped");
                    }
                }
            }
        }
    });
}
