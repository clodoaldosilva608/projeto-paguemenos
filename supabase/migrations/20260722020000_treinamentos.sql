CREATE TABLE IF NOT EXISTS public.treinamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  link text,
  tipo text DEFAULT 'link',
  duracao text,
  obrigatorio boolean DEFAULT false,
  ativo boolean DEFAULT true,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz DEFAULT now()
);
GRANT SELECT ON public.treinamentos TO authenticated;
GRANT ALL ON public.treinamentos TO service_role;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read treinamentos" ON public.treinamentos FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "Admins manage treinamentos" ON public.treinamentos FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));

CREATE TABLE IF NOT EXISTS public.treinamentos_concluidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  concluido_em timestamptz DEFAULT now(),
  UNIQUE (treinamento_id, usuario_id)
);
GRANT SELECT, INSERT ON public.treinamentos_concluidos TO authenticated;
GRANT ALL ON public.treinamentos_concluidos TO service_role;
ALTER TABLE public.treinamentos_concluidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own concluidos" ON public.treinamentos_concluidos FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));
CREATE POLICY "Users insert own concluidos" ON public.treinamentos_concluidos FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
