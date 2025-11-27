// src/types/global.d.ts

declare global {
    interface DujyoAPI {
      [x: string]: any;
      getAccounts: () => Promise<string[]>;  // Ajusta este tipo según los métodos de tu billetera
      connect: () => void;
      }

      interface Window {
        DujyoAPI: DujyoAPI;
      }
    }
  
  
  console.log('Global types loaded')

  export {};
  