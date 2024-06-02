const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');

const { Instance } = require('./src/instance');
const { getLogger } = require('./src/logUtil');
const { GrassApi } = require('./src/grassApi');

let logger = getLogger('default');

async function loadAccountList(accountFilePath) {
    try {
        const content = await fs.readFile(accountFilePath);
        const accountList = content.toString()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .map(line => {
                const [username, password, userid] = line.split(':').map(part => part.trim());
                if (!username || !password || !userid) {
                    logger.error(`Invalid line format in account file: ${line}`);
                    return null;
                }
                return { username, password, userid };
            })
            .filter(account => account !== null);

        return accountList;
    } catch (error) {
        logger.error(`Error loading account file: ${error.message}`);
        return [];
    }
}

async function loadProxylist(proxyFilePath) {
    const content = await fs.readFile(proxyFilePath);
    return content.toString()
        .split('\n')
        .map(line => {
            return line.trim();
        }).filter(url => {
            return url !== '';
        }).map(url => {
            if (url.startsWith('http://')) {
                return url
            } else if (url.startsWith('socks5')) {
                if (url.includes('@')) {
                    return url
                } else {
                    let [ip, port, username, password] = url.split('//')[1].split(':')
                    return `socks5://${username}:${password}@${ip}:${port}`;
                }
            } else if (url.includes(' ')) {
                let [ipPort, username, password] = url.split(' ');
                return `socks5://${username}:${password}@${ipPort}`;
            }
            let [ip, port, username, password] = url.split(':');
            return `http://${username}:${password}@${ip}:${port}`;
        })
}

async function waitThreeSecondsAsync(s = 3 * 1000) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, s);
    });
}

async function runInstanceWithRestart(username, password, userid, proxy, groupName) {
    logger.info(`Run: ${username} ${password} ${proxy} ${groupName}`);
    try {
        const instance = new Instance(username, password, proxy, userid, groupName);
        await instance.run();
    } catch (error) {
        logger.error(`Run User:${username} - ${password} , Proxy:${proxy} - ${groupName} Fail: ${error.message}`);
        setTimeout(() =>
            runInstanceWithRestart(username, password, proxy, userid, groupName),
            1000
        );
    }
}

async function main() {
    program
        .arguments('<proxyAmount> <groupName>')
        .action(async (proxyAmount, groupName) => {
            const accountFileName = 'account.txt';
            const proxyFileName = 'proxy.txt';
            const ipNumber = parseInt(proxyAmount);

            const accountList = await loadAccountList(path.join(__dirname, 'file', accountFileName));
            const proxyList = await loadProxylist(path.join(__dirname, 'file', proxyFileName));
            
            logger.info(`Read account file: ${accountFileName}, number of accounts: ${accountList.length}`);
            logger.info(`Read proxy file: ${proxyFileName}, number of proxies: ${proxyList.length}`);
            
            for(let i = 0; i < accountList.length; i++) {
                const account = accountList[i];
                for(let j = 0; j < ipNumber; j++) {
                    let proxyIndex = (i * ipNumber + j) % proxyList.length;
                    const proxyUrl = proxyList[proxyIndex];
                    runInstanceWithRestart(account.username, account.password, account.userid, proxyUrl, `${groupName}_${j}`)
                        .catch(error => {
                            logger.error(`Run: ${account.username}-${account.password}-${proxyUrl} error: ${error}`);
                        });
                    await waitThreeSecondsAsync(100);
                }
            }
        });
    
    program.parse(process.argv);
}

main().catch(error => {
    logger.error(`Error in main execution: ${error.message}`);
});
