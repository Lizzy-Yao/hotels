const express = require('express');
const app = express();
const port = 3000;
 
// 基础路由
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World!',
    timestamp: new Date().toISOString()
  });
});
 
// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`当前时间: ${new Date().toLocaleString()}`);
});