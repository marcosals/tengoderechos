-- Seed Popular Queries
INSERT INTO public.popular_queries (query_text, category, is_featured, search_count)
VALUES
    ('¿Qué obligaciones de pensión alimenticia tengo como padre o madre?', 'Civil', TRUE, 120),
    ('¿Qué pasa legalmente si choco mi auto por detrás a otro vehículo?', 'Tránsito', TRUE, 95),
    ('¿Cuáles son mis derechos laborales ante un despido injustificado?', 'Laboral', TRUE, 85),
    ('¿Qué hacer si un policía me detiene en la calle sin una orden?', 'Constitucional', TRUE, 150),
    ('¿Cuáles son los requisitos legales para casarse por el civil en México?', 'Civil', FALSE, 40),
    ('¿Qué hacer si una tienda no quiere hacerme válida una garantía?', 'Consumidor', FALSE, 60),
    ('¿Cuál es la diferencia entre un delito civil y uno penal?', 'Penal', FALSE, 35)
ON CONFLICT (query_text) DO NOTHING;
