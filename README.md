# Get-grass Proxy Farming


Edit accounts in `/file/account.txt`

Edit proxies in `/file/proxy.txt`
#
Account format          : `username:password:UserID`

Proxy format (sock5)    ：`ip:port username password`
#
How to get UserID?

1. go to https://app.getgrass.io/dashboard

2. press F12, go to console
   
3. type `localStorage.getItem('userId')`
#

**Running script:**

```bash
  node index.js "amount of proxy used" "group name"
```
```bash
  example: node index.js 10 account1
```

