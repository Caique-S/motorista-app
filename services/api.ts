export const enviarLocalizacao = async (apiUrl: string, data: any) => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.warn('Resposta da API não OK:', response.status);
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
};