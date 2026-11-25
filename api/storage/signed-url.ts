import { handleSignedUrlRequest } from '../../server/supabaseHandlers';

export default async function handler(req: any, res: any) {
  return handleSignedUrlRequest(req, res);
}
