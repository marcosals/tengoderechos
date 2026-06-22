-- Create RPC function to increment search counts of popular queries or insert new ones
CREATE OR REPLACE FUNCTION public.increment_popular_query(p_query_text TEXT)
RETURNS VOID AS $$
DECLARE
  v_normalized_query TEXT;
BEGIN
  -- Normalize query by trimming surrounding whitespace
  v_normalized_query := trim(p_query_text);

  IF v_normalized_query = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.popular_queries (query_text, category, search_count, last_triggered_at)
  VALUES (v_normalized_query, 'General', 1, NOW())
  ON CONFLICT (query_text)
  DO UPDATE SET 
    search_count = popular_queries.search_count + 1,
    last_triggered_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
