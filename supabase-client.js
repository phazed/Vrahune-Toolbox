import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mxhdjaughcenjbndyzkf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TpSfosqGKbODi_BaxTQvtQ_77L385OG";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
