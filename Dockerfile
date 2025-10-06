# Sử dụng Node.js Alpine để giảm kích thước image
FROM node:20-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và yarn.lock để cài đặt dependencies
COPY package.json yarn.lock ./

# Cài đặt Yarn và dependencies
RUN yarn install --frozen-lockfile

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Biên dịch TypeScript nếu cần
RUN yarn build

# Chạy ứng dụng
CMD ["yarn", "start:prod"]
