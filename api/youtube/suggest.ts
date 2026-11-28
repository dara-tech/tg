export default async function handler(req: any, res: any) {
  const q =
    req.query?.q ||
    (req.url ? new URL(req.url, 'http://localhost').searchParams.get('q') : '') ||
    '';

  if (!q.trim()) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ suggestions: [] });
  }

  try {
    const ytRes = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`
    );
    const data = await ytRes.json();
    const suggestions = Array.isArray(data[1]) ? data[1] : [];
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ suggestions });
  } catch {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ suggestions: [] });
  }
}
