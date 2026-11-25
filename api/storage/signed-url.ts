import { handleSignedUrlRequest } from '../../server/supabaseHandlers.js';

export default async function handler(req: any, res: any) {
  return handleSignedUrlRequest(req, res);
}
