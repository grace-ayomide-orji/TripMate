export type PendingMessage = {
    text: string;
    fileParts: { type: 'file'; mediaType: string; url: string }[];
  };
  
  let pending: PendingMessage | null = null;
  
  export function setPendingMessage(msg: PendingMessage): void {
    pending = msg;
  }
  
  /** Returns the pending message and clears it in one atomic step. */
  export function consumePendingMessage(): PendingMessage | null {
    const msg = pending;
    pending = null;
    return msg;
  }