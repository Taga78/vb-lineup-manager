-- Gender: only 'M' and 'F', required, default 'M'
UPDATE public.players SET gender = 'M' WHERE gender IS NULL OR gender NOT IN ('M', 'F');

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_gender_check;
ALTER TABLE public.players ALTER COLUMN gender SET DEFAULT 'M';
ALTER TABLE public.players ALTER COLUMN gender SET NOT NULL;
ALTER TABLE public.players ADD CONSTRAINT players_gender_check CHECK (gender IN ('M', 'F'));
