---
title: Mac 上配置 MNMP 环境
tags:
  - 折腾
  - MNMP
permalink: /post/41f45ee.html
pubDatetime: 2020-11-30 21:38:14
---

## 前言

今天打算实践一下 Wordpress 主题开发，但由于电脑上没有 PHP 和 MySQL 的环境，于是折腾了一下，结果发现安装配置过程一堆的坑，虽然最终选择了 Docker 环境开发，但毕竟已经踩坑了，就记录一下。

本文记录如何在 Mac OS 上配置 Ngnix + PHP + MySQL，以及最后如何成功安装 Wordpress。

<a name="UovYc"></a>

## 过程

<a name="EeiNv"></a>

### Nginx

<a name="8LI7s"></a>

#### 1. 安装

```bash
brew install nginx
```

<a name="rc4Yt"></a>

#### 2. 开启

```bash
# 启动
brew services start nginx
# 停止
brew services stop nginx
# 重启
brew services restart nginx

# 开机启动
sudo cp /usr/local/opt/nginx/homebrew.mxcl.nginx.plist /Library/LaunchDaemons/
sudo launchctl load -w /Library/LaunchDaemons/homebrew.mxcl.nginx.plist

# 关闭开机启动
sudo launchctl unload -w ~/Library/LaunchAgents/homebrew.mxcl.nginx.plist
```

<a name="HpcvU"></a>

#### 3. 访问

nginx 默认监听 8080 端口，可以这样看一下是否能够访问：

```bash
curl localhost:8080

## 看到这个返回表示 ok

<html><body><h1>It works!</h1></body></html>
```

<a name="lqRdT"></a>

#### 4. 配置主机

为了方便管理，我们在 nginx 配置目录下的 `servers`   新增一个配置文件：

```bash
vim /usr/local/etc/nginx/servers/www.conf
```

并填充以下内容：

```nginx
server {
    listen       80;
  	# 如果需要域名访问的话，注意需要修改 /etc/hosts 文件
    # server_name  4ark.dev;
  	# 项目根目录
    root /Users/4ark/www;

    location / {
        index index.php index.html;
        autoindex on;
    }
}
```

注意：最好每个项目都单独一个配置文件。

从上面的配置可以看到我们将项目放在用户下的 `www`   下，在这个目录新建一个 html 文件：

```bash
mkdir ~/www

vim ~/www/index.html
```

这时候重启一下 nginx 服务，访问刚刚配置的主机，就可以访问到上面这个 html 文件

```bash
brew services restart nginx

curl localhost
```

<a name="Qdk9Q"></a>

### PHP

<a name="CezDV"></a>

#### 1. 安装

Mac 已经自带有 PHP，你可以通过以下命令查看本机是否存在 PHP：

```bash
brew list | grep php
```

如果没有，或者你想安装其他版本的话，那就先安装

```bash
# 可以先搜索以下是否有你想要的版本
brew search php

# 安装 php 7.3
brew search php@7.3
```

<a name="qlUNa"></a>

#### 2. 配置

配置 php-fpm 权限

```bash
vim /usr/local/etc/php/7.3/php-fpm.d/www.conf
```

修改如下：

```diff
- user = _www
+ user = 4ark # 你的用户名
group = _www
```

如果正在运行 php-fpm，那就先关闭

```bash
sudo killall php-fpm
```

然后启动：

```
sudo php-fpm -D
```

这时候如果遇到以下报错：

```bash
ERROR: failed to open configuration file '/private/etc/php-fpm.conf': No such file or directory (2)
ERROR: failed to load configuration file '/private/etc/php-fpm.conf'
ERROR: FPM initialization failed
```

错误信息显示，不能打开配置文件， `cd /private/etc` ，发现没有  **php-fpm.conf**  文件，但是有  **php-fpm.conf.default**  文件。这个文件是默认配置，我们可以复制一份，改名为  **php-fpm.conf**，然后再根据需要改动配置。

```bash
sudo cp /private/etc/php-fpm.conf.default /private/etc/php-fpm.conf

sudo cp /private/etc/php-fpm.d/www.conf.default /private/etc/php-fpm.d/www.conf
```

执行   `php-fpm` ，再次报错：

```bash
ERROR: failed to open error_log (/usr/var/log/php-fpm.log): No such file or directory (2)
ERROR: failed to post process the configuration
ERROR: FPM initialization failed
```

错误信息显示，不能打开错误日志文件。 `cd /usr/var/log`   发现根本没有这个目录，甚至连  **var**  目录都没有，加上为了避免权限问题，干脆配置到  **/usr/local/var/log**  目录。

```bash
vim /private/etc/php-fpm.conf

# 将 error_log 改为 /usr/local/var/log/php-fpm.log
error_log = /usr/local/var/log/php-fpm.log
```

执行   `sudo php-fpm` ，再次报错：

```bash
ERROR: unable to bind listening socket for address '127.0.0.1:9000': Address already in use (48)
ERROR: FPM initialization failed
```

说是 9000 端口被占用了，但 `lsof -i:9000`   又看不见，于是只能换个端口：

```bash
vim /private/etc/php-fpm.d/www.conf

# 修改监听端口为 9999
listen = 9999
```

再执行 `sudo php-fpm -D`  ，就能够正常启动了。

<a name="Ih0Fu"></a>

#### 3. 配置 nginx

这时候我们修改 nginx 的主机配置，使它支持 PHP

```diff
server {
    listen       80;
    server_name  4ark.dev;
    root /Users/4ark/www;

    location / {
        index index.php index.html;
        autoindex on;
    }

+    location ~ \.php$ {
+        fastcgi_pass   127.0.0.1:9999;
+        fastcgi_index  index.php;
+        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
+        include        fastcgi_params;
+    }
}
```

然后重启 nginx 服务

```bash
brew services restart nginx
```

这时候在项目根目录新增一个 php 文件

```bash
vim ~/www/index.php

# 内容
<?php

echo 'hello world!';
```

测试一下

```bash
curl localhost

# 返回结果
hello world!
```

<a name="zJVB5"></a>

### MySQL

通常来说 Mac OS 也是自带有 MySQL，你可以通过以下命令查看本机是否存在 MySQL

```bash
brew list --formula | grep mysql
```

如果没有安装的话，那就先安装

```bash
brew install mysql
```

安装完成以后，会发现并没有让我们设置密码，运行以下进入密码设置

```bash
mysql_secure_installation
```

设置完密码之后，就可以登录了

```bash
mysql -uroot -p
# 输入密码
```

<a name="HeiO2"></a>

### Wordpress

环境终于配置好了，终于可以安装 Wordpress 啦，然而事情并没有这么简单，当我满心欢喜把 wordpress 下载到项目根目录下，就好像这样：

```bash
cp -r ~/download/wordpress ~/www/wordpress
```

然后我们创建一个数据库：

```bash
[root@host]# mysql -u root -p
Enter password:******  # 登录后进入终端

mysql> create DATABASE `wordpress-test`;
```

然后我们通过浏览器访问 `localhost/wordpress`  ，就可以看到一个 Wordpress 的安装界面，输入数据库相关的信息后，本以为可以像往常一样成功进入下一步，结果我看到了这个错误：**WordPress 建立数据库连接时出错**。

结果再尝试了几次，确保所有表单都已经填写正确，依然无法正常建立数据库连接，意识到事情可能并没有这么简单， 于是我在网上找到了一个解决方案，大概就是说无法使用 root 进行登录，需要新增一个用户：

```bash
grant all on wordpress-test.* to 'wp-test'@'localhost' identified by 'password'
```

然后使用这个用户进行登录，然后在我这里却行不通，依然显示同样的错误，于是我开启一下 `debug`  ，看一下导致是什么问题

```bash
cp wp-config-sample.php wp-config.php

vim wp-config.php
```

做以下改动：

```diff
// 填写以下数据库信息

// ** MySQL 设置 - 具体信息来自您正在使用的主机 ** //
/** WordPress数据库的名称 */
define( 'DB_NAME', 'database_name_here' );

/** MySQL数据库用户名 */
define( 'DB_USER', 'username_here' );

/** MySQL数据库密码 */
define( 'DB_PASSWORD', 'password_here' );

/** MySQL主机 */
define( 'DB_HOST', 'localhost' );

// 开启 DEBUG

- define('WP_DEBUG', false);
+ define('WP_DEBUG', true);
```

再访问一下，可以看到以下错误：

```bash
No such file or directory 建立数据库连接时出错
```

其实原因是 PHP 配置中的 `mysql.sock`   与本机的 MySQL 中的路径不一致，可以通过这样查看：

```bash
vim ~/www/phpinfo.php

# 内容
<?php
phpinfo();
```

然后打开 `localhost/phpinfo`  ，搜索 `default_socket`  。

然后再查看 MySQL 的 `socket`   路径：

```bash
[root@host]# mysql -u root -p
Enter password:******  # 登录后进入终端

mysql> status;

# 输出
mysql  Ver 8.0.22 for osx10.16 on x86_64 (Homebrew)

Connection id:		114
Current database:
Current user:		root@localhost
SSL:			Not in use
Current pager:		less
Using outfile:		''
Using delimiter:	;
Server version:		8.0.22 Homebrew
Protocol version:	10
Connection:		Localhost via UNIX socket
Server characterset:	utf8mb4
Db     characterset:	utf8mb4
Client characterset:	utf8mb4
Conn.  characterset:	utf8mb4
UNIX socket:		/tmp/mysql.sock
Binary data as:		Hexadecimal
Uptime:			14 hours 59 min 44 sec
```

如果与 PHP 中的 `mysql.sock`   路径不一致，则需要修改：

```bash
sudo cp /private/etc/php.ini.default /private/etc/php.ini

vim /private/etc/php.ini

## 修改为以下

pdo_mysql.default_socket= /tmp/mysql.sock
mysqli.default_socket = /tmp/mysql.sock
```

然后重启一下 `php-fpm`

```bash
sudo killall php-fpm
sudo php-fpm -D
```

再看看 `phpinfo`  ，应该就生效了。

然后再尝试登录一下 Wordpress，又发现了以下错误：

```bash
error: The server requested authentication method unknown to the client [duplicate]
```

解决方案如下：

```bash
[root@host]# mysql -u root -p
Enter password:******  # 登录后进入终端

mysql> ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password
BY 'your_root_password';
```

应该就可以了。

<a name="rgfRu"></a>

## 参考链接

* [安装 Nginx + MySQL + PHP 环境（ macOS 篇 ）](https://ismdeep.com/posts/2020-04-22-install-nginx-mysql-php-on-macos.html)
* [[开发环境]Mac 配置 php-fpm](https://github.com/musicode/test/issues/5)
* [PHP with MySQL 8.0+ error: The server requested authentication method unknown to the client [duplicate]](https://stackoverflow.com/questions/52364415/php-with-mysql-8-0-error-the-server-requested-authentication-method-unknown-to)
