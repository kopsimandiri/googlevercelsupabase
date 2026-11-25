import { handleUploadProofRequest } from '../../server/supabaseHandlers.js';

export default async function handler(req: any, res: any) {
  return handleUploadProofRequest(req, res);
}
