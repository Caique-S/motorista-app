export const enviarLocalizacao = async (apiUrl: string, data: any): Promise<boolean> => {
  try {
    console.log('Enviando localização para:', apiUrl, data);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.warn('Resposta da API não OK:', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro na requisição:', error);
    return false;
  }
};