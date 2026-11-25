import { handleHealthRequest } from '../server/supabaseHandlers.js';

export default async function handler(req: any, res: any) {
  return handleHealthRequest(req, res);
}
