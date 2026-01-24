import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatWindow } from "./components/ChatWindow";

interface BackendInfo {
  port: number;
  config_path: string | null;
}

function App() {
  const [configPath, setConfigPath] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Get config path from Tauri (if opened via .agentforge file)
    const getConfigPath = async () => {
      try {
        const info = await invoke<BackendInfo>("get_backend_info");
        if (info.config_path) {
          setConfigPath(info.config_path);
        }
      } catch {
        // Running outside Tauri or no config path
      }
    };

    getConfigPath();
  }, []);

  return <ChatWindow configPath={configPath} />;
}

export default App;
