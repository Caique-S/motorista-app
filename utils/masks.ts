export const cpfMask = (value: string) => {
  try {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  } catch (error) {
    console.error('Erro cpfMask:', error);
    return value;
  }
};