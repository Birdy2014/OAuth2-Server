import { Logger } from '../../Logger';

export async function run(args: string[]) {
    await Logger.info("Stopping server");
    process.exit(0);
}
