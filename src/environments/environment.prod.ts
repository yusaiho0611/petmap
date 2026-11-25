export const environment = {
  production: true,
  // 部署後由同一個 Express 服務提供 www/，所以用相對路徑就夠
  // 留空 = 直接打 /events、/summary，唔會去 localhost
  serverUrl: ''
};
