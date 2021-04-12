import { Database } from '../../db/Database';
import { Logger } from '../../Logger';

export async function run(args: string[]) {
    await Logger.info("Stopping server");
    Database.close();
    process.exit(0);
}
