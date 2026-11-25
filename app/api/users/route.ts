// Account administration is available only in the standalone build.
export async function GET(){return Response.json({error:'No disponible.'},{status:404});}
export async function POST(){return GET();}
