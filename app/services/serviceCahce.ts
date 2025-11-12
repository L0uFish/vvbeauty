// Simple in-memory cache for services
const serviceCache = new Map<string, any>();

export const setServiceInCache = (service: any) => {
  if (!service?.id) return;
  serviceCache.set(service.id, service);
};

export const getServiceFromCache = (id: string) => {
  return serviceCache.get(id) || null;
};

export const setMultipleServices = (services: any[]) => {
  if (!Array.isArray(services)) return;
  for (const s of services) {
    if (s?.id) serviceCache.set(s.id, s);
  }
};