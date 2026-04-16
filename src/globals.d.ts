declare global {
  interface Window {
    __CREATORGRAPH_RUNNING__?: boolean;
    __CREATORGRAPH_LISTENER_READY__?: boolean;
  }
}

export {};
