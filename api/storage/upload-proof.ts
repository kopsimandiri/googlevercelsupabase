import { handleUploadProofRequest } from '../../server/supabaseHandlers';

export default async function handler(req: any, res: any) {
  return handleUploadProofRequest(req, res);
}
