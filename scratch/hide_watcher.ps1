$abyssPath = "c:\Users\hosih\GitHub\ElysiaAI\scratch\void\abyss\depth_01\layer_7\sector_alpha\core\null\oblivion\watcher"
New-Item -Path $abyssPath -ItemType Directory -Force
Move-Item -Path "c:\Users\hosih\GitHub\ElysiaAI\scratch\twitter_watcher.py" -Destination "$abyssPath\sovereign_eye.py"
if (Test-Path "c:\Users\hosih\GitHub\ElysiaAI\scratch\watcher_state.json") {
    Move-Item -Path "c:\Users\hosih\GitHub\ElysiaAI\scratch\watcher_state.json" -Destination "$abyssPath\watcher_state.json"
}
attrib +s +h "c:\Users\hosih\GitHub\ElysiaAI\scratch\void"
