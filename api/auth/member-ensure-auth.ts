import { handleMemberEnsureAuthRequest } from '../../server/supabaseHandlers.js';

export default async function handler(req: any, res: any) {
  return handleMemberEnsureAuthRequest(req, res);
}
