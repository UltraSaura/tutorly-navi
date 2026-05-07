-- Add keywords array to learning_topics
ALTER TABLE learning_topics 
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT ARRAY[]::text[];

-- Add keywords array to objectives
ALTER TABLE objectives 
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT ARRAY[]::text[];

-- Add sample keywords to existing objectives based on subdomain
UPDATE objectives SET keywords = ARRAY['multiplication', 'division', 'addition', 'soustraction', 'calcul mental', 'tables', 'produit', 'quotient', 'somme', 'différence']
WHERE subdomain = 'Quatre opérations' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['fractions', 'numérateur', 'dénominateur', 'simplifier', 'équivalence', 'partie', 'entier']
WHERE subdomain = 'Fractions' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['périmètre', 'longueur', 'mètre', 'centimètre', 'mesurer', 'distance', 'unités']
WHERE subdomain = 'Longueurs' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['aire', 'surface', 'carré', 'rectangle', 'mètre carré', 'cm²', 'superficie']
WHERE subdomain = 'Aires' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['angle', 'degré', 'droit', 'aigu', 'obtus', 'rapporteur', 'mesure']
WHERE subdomain = 'Angles' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['masse', 'gramme', 'kilogramme', 'peser', 'balance', 'poids']
WHERE subdomain = 'Masses' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['décimal', 'virgule', 'dixième', 'centième', 'nombre à virgule']
WHERE subdomain = 'Nombres decimaux' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['algèbre', 'équation', 'inconnue', 'variable', 'expression']
WHERE subdomain = 'Algèbre' AND (keywords IS NULL OR keywords = '{}');

UPDATE objectives SET keywords = ARRAY['probabilité', 'chance', 'hasard', 'événement', 'possible', 'impossible']
WHERE subdomain = 'Probabilités' AND (keywords IS NULL OR keywords = '{}');