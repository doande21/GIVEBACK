
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface Window {
  aistudio?: AIStudio;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

declare module '*.png' {
  const value: string;
  export default value;
}
