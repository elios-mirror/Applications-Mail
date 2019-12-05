import Sdk from 'elios-sdk';

var Imap = require('imap'),
  cheerio = require('cheerio'),
  html = require('./index.html'),
  simpleParser = require("mailparser").simpleParser

const $ = cheerio.load(html);

export default class Email {

  sdk: Sdk

  mails: any = [];

  widget: any;

  imap: any;

  mailAdress: string;
  password: string;
  provider = 'IMAP-mail.Outlook.com'
  intervalID: any;

  constructor() {
    this.sdk = new Sdk();

    this.sdk.config().subscribe((conf: any) => {
      this.configChange(conf)
    });
  }

  openInbox = (cb: Function) => {
    this.imap.openBox('INBOX', true, cb);
  }

  connect = () => {
    this.imap.connect();
  }

  getLatestMails = () => {
    let date = new Date();

    this.mails = []
    date.setDate(date.getDate() - 7);

    this.imap.search(['UNSEEN', ['SINCE', date.toDateString()]], (err: any, results: any) => {
      if (err) throw err;

      var numberReceived = results.length

      var f = this.imap.fetch(results, {
        bodies: '',
        struct: true
      });

      f.on('message', (msg: any, seqno: any) => {

        msg.on('body', (stream: any, info: any) => {
          var buffer = '';

          stream.on('data', function (chunk: any) {
            buffer += chunk.toString('utf8');
          });

          stream.once('end', () => {
            simpleParser(buffer, (err: any, parsed: any) => {
                            
              this.mails.push(parsed);
              if (this.mails.length === numberReceived) {
                this.displayMailList()
              }

            });
          });
        });

      });

      f.once('error', function (err: any) {
        console.log('Fetch error: ' + err);
      });
      f.once('end', () => {
        console.log('Done fetching all messages!');

      });
    });
  }

  wait(ms: number){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
    }
  }

  orderList() {
    this.mails.sort(function(a: any, b: any) {
      a = new Date(a.date);
      b = new Date(b.date);
      return a>b ? -1 : a<b ? 1 : 0;
    })
  }

  async displayMailList() {

    let tmplt: Cheerio;

    if (this.mails.length > 0) {

      this.orderList()

      tmplt = $('.minimalized-mail');
  
      $(tmplt).find('.mail_object').text(this.mails[0].subject);
      $(tmplt).find('.mail_details').text('From : ' + this.mails[0].from.value[0].name + ' - ' + new Date(this.mails[0].date).toDateString());      

      this.widget.html($('body').html());

      var index = 1;
      this.intervalID = setInterval(() => {
        if (index === this.mails.length) {
          this.getLatestMails()
          clearInterval(this.intervalID)
          return
        }

        const element = this.mails[index];
        tmplt = $('.minimalized-mail');
    
        $(tmplt).find('.mail_object').text(element.subject);
        $(tmplt).find('.mail_details').text('From : ' + element.from.value[0].name + ' - ' + new Date(element.date).toDateString());      
  
        index++;
        this.widget.html($('body').html());
  
      }, 4000);  
    }
  }

  configChange(conf: any) {
    if (conf.mail) {
      this.mailAdress = conf.mail
    }
    if (conf.password) {
      this.password = conf.password
    }
    if (conf.provider) {
      this.provider = conf.provider
    }

    if (!conf.mail && !conf.password) {
      this.renderConnectMessage()
    }

    if (this.intervalID !== undefined) {
      clearInterval(this.intervalID)
    }

    this.setImap()
  }

  renderConnectMessage() {
    $('.mail_details').text('')
    $('.mail_object').text('Please connect to your email adress through Elios App.')
    this.widget.html($('body').html())
  }

  setImap() {
    $('.mail_details').text('')
    $('.mail_object').text('Please wait...')
    this.widget.html($('body').html())  
    this.imap = new Imap({
      user: this.mailAdress,
      password: this.password,
      host: this.provider,
      port: 993,
      tls: true
    })

    this.imap.once('ready', () => {
      console.log('imap ready');

      this.openInbox((err: any, box: any) => {
        console.log('inbox opened');

        this.getLatestMails();
        
      });
    });
    this.imap.once('error', (err: any) => {
      if (err.source === "authentication") {
        this.renderConnectMessage()
      }

      console.log(err);
    });

    this.imap.once('end', function () {
      console.log('Connection ended');
    });

    this.imap.connect();
  }

  start() {
    this.widget = this.sdk.createWidget();
    
    this.setImap()
  }
}

new Email().start();
