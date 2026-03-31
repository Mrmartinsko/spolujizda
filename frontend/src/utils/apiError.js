export const getApiErrorMessage = (error, fallback = 'Doslo k chybe.') => {
  const responseData = error?.response?.data;

  // Hardened backend vraci hlavne `error`, fallback na `message` drzi kompatibilitu se starsimi odpovedmi.
  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error.trim();
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim() && error.message !== 'Network Error') {
    return error.message.trim();
  }

  return fallback;
};
