import { useEffect } from 'react';
import '../styles/chatbot.css';

const CHATBOT_SCRIPT_ID = 'traffic-risk-chatbot-script';
const CHATBOT_SCRIPT_SRC = 'https://cdn.jotfor.ms/agent/embedjs/019d58bc04687db282dec5c9d3e3a70fd4c8/embed.js';

function scheduleScriptLoad(loadScript) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(loadScript, { timeout: 1800 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(loadScript, 900);
  return () => window.clearTimeout(timeoutId);
}

export default function FloatingChatbot() {
  useEffect(() => {
    document.documentElement.classList.add('has-floating-chatbot');

    const loadScript = () => {
      if (document.getElementById(CHATBOT_SCRIPT_ID)) {
        return;
      }

      const script = document.createElement('script');
      script.id = CHATBOT_SCRIPT_ID;
      script.src = CHATBOT_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.chatbot = 'traffic-risk-assistant';
      document.body.appendChild(script);
    };

    const cancelLoad = scheduleScriptLoad(loadScript);

    return () => {
      cancelLoad();
      document.documentElement.classList.remove('has-floating-chatbot');
    };
  }, []);

  return <div className="chatbot-safe-zone" aria-hidden="true" />;
}
