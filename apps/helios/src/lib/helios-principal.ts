export type HeliosPrincipal = {
  userId: string;
  companyId: string;
  subject: string;
  issuer: string;
  email: string;
  name: string;
  role: string;
};

export type HeliosIdentity = {
  subject: string;
  issuer: string;
  email: string;
  name: string;
};
