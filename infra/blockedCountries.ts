/**
 * List of countries blocked from accessing CloudFront distributions.
 * Sanctions and compliance, plus China's bot traffic. Bots from elsewhere
 * are left to the firewall's bot rules, so real visitors there can sign in.
 */
export const blockedCountries = [
  'AF', // Afghanistan - sanctions/instability
  'BY', // Belarus - sanctions/compliance
  'CF', // Central African Republic - sanctions
  'CN', // China - bot traffic and compliance
  'CU', // Cuba - sanctions/compliance
  'ER', // Eritrea - sanctions/compliance
  'IR', // Iran - sanctions/compliance
  'KP', // North Korea - sanctions/compliance
  'LB', // Lebanon - instability/compliance
  'LY', // Libya - sanctions/compliance
  'ML', // Mali - sanctions/instability
  'MM', // Myanmar - sanctions/compliance
  'NI', // Nicaragua - sanctions/compliance
  'RU', // Russia - sanctions/compliance
  'SD', // Sudan - sanctions/compliance
  'SO', // Somalia - sanctions/instability
  'SS', // South Sudan - sanctions/compliance
  'SY', // Syria - sanctions/compliance
  'TM', // Turkmenistan - compliance
  'VE', // Venezuela - sanctions/compliance
  'YE', // Yemen - sanctions/conflict zone
  'ZW', // Zimbabwe - sanctions/compliance
];
