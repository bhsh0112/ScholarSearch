/**
 * nodemailer 类型声明占位。
 *
 * 如果未来需要更完善的类型，可以安装：
 *   npm install --save-dev @types/nodemailer
 */
declare module "nodemailer" {
  export type SendMailOptions = {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  };

  export type Transporter = {
    sendMail: (options: SendMailOptions) => Promise<unknown>;
  };

  export type TransportOptions = unknown;

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}


