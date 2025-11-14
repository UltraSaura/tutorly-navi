-- Enable RLS on all curriculum tables
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Add read-only policies for all users (curriculum is public data)
CREATE POLICY "Anyone can read domains" ON domains FOR SELECT USING (true);
CREATE POLICY "Anyone can read subdomains" ON subdomains FOR SELECT USING (true);
CREATE POLICY "Anyone can read objectives" ON objectives FOR SELECT USING (true);
CREATE POLICY "Anyone can read success_criteria" ON success_criteria FOR SELECT USING (true);
CREATE POLICY "Anyone can read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can read units" ON units FOR SELECT USING (true);
CREATE POLICY "Anyone can read lessons" ON lessons FOR SELECT USING (true);

-- Add admin-only write policies
CREATE POLICY "Admins can manage domains" ON domains FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage subdomains" ON subdomains FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage objectives" ON objectives FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage success_criteria" ON success_criteria FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tasks" ON tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage units" ON units FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage lessons" ON lessons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));