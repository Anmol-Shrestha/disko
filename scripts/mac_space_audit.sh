#!/bin/bash
# mac_space_audit.sh — READ-ONLY. Finds what's behind macOS "System Data".
# Deletes nothing. Run:  bash mac_space_audit.sh | tee audit.txt
# Tip: give Terminal "Full Disk Access" (System Settings > Privacy & Security)
# or some folders will show as 0/denied.

H="$HOME"
size() { [ -e "$1" ] && du -sh "$1" 2>/dev/null | awk -v p="$1" '{printf "%8s  %s\n", $1, p}'; }

echo "=== Disk overview ==="
df -h / | tail -1
echo

echo "=== Time Machine local snapshots (often 10-50GB of 'System Data') ==="
tmutil listlocalsnapshots / 2>/dev/null || echo "none / not accessible"
echo

echo "=== Known space hogs (sorted) ==="
{
  # Developer: Xcode / iOS
  size "$H/Library/Developer/Xcode/DerivedData"
  size "$H/Library/Developer/Xcode/Archives"
  size "$H/Library/Developer/Xcode/iOS DeviceSupport"
  size "$H/Library/Developer/CoreSimulator"
  size "$H/Library/Developer/CoreSimulator/Caches"
  # Containers / VMs
  size "$H/Library/Containers/com.docker.docker"
  size "$H/.docker"
  size "$H/.orbstack"
  size "$H/.colima"
  # AI / ML model caches
  size "$H/.cache/huggingface"
  size "$H/.ollama"
  size "$H/.cache/torch"
  size "$H/.cache/lm-studio"
  size "$H/.lmstudio"
  size "$H/Library/Application Support/Claude"
  # Package manager caches
  size "$H/Library/Caches/pip"
  size "$H/.cache/pip"
  size "$H/.npm"
  size "$H/Library/Caches/Yarn"
  size "$H/Library/pnpm"
  size "$H/Library/Caches/Homebrew"
  size "$H/.gradle"
  size "$H/.m2"
  size "$H/.cargo"
  size "$H/miniconda3/pkgs"
  size "$H/anaconda3/pkgs"
  size "$H/opt/anaconda3/pkgs"
  size "$H/.conda/pkgs"
  # General caches / logs / backups
  size "$H/Library/Caches"
  size "$H/Library/Logs"
  size "$H/Library/Application Support/MobileSync/Backup"
  size "$H/Library/Mail"
  size "$H/Library/Messages/Attachments"
  size "$H/.Trash"
  size "/Library/Caches"
  size "/private/var/vm"
  size "/private/var/folders"
  size "/Library/Updates"
} | sort -rh
echo

echo "=== Top 15 folders in ~/Library ==="
du -sh "$H/Library"/* 2>/dev/null | sort -rh | head -15
echo
echo "=== Top 15 in ~/Library/Application Support ==="
du -sh "$H/Library/Application Support"/* 2>/dev/null | sort -rh | head -15
echo
echo "=== Top 15 in ~/Library/Caches ==="
du -sh "$H/Library/Caches"/* 2>/dev/null | sort -rh | head -15
echo
echo "=== Hidden dot-folders in home ==="
du -sh "$H"/.[!.]* 2>/dev/null | sort -rh | head -15
echo

echo "=== node_modules folders (top 15, may take a minute) ==="
find "$H" -type d -name node_modules -prune -not -path "*/Library/*" 2>/dev/null \
  | while read -r d; do du -sh "$d" 2>/dev/null; done | sort -rh | head -15
echo

echo "=== Python venvs (.venv / venv) ==="
find "$H" -type d \( -name ".venv" -o -name "venv" \) -prune -not -path "*/Library/*" 2>/dev/null \
  | while read -r d; do du -sh "$d" 2>/dev/null; done | sort -rh | head -15
echo
echo "Done. Nothing was deleted."
