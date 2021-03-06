const dotenv = require('dotenv');
const mysql = require('mysql');
const http = require('http');
const qs = require('querystring');

const template = require('./utils/template');

dotenv.config();

const DATABASE = process.env.DATABASE;
const PASSWORD = process.env.PASSWORD;
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT;

const database = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: DATABASE,
  password: PASSWORD,
});

database.connect();

const app = http.createServer((req, res) => {
  const url = new URL(req.url, BASE_URL);
  const pathName = url.pathname;

  try {
    if (req.method === 'GET') {
      if (pathName === '/') {
        database.query('SELECT * FROM topic', (error, topics) => {
          if (error) throw error;

          const id = url.searchParams.get('id');

          if (id) {
            database.query(
              'SELECT * FROM topic LEFT JOIN author ON topic.author_id = author.id WHERE topic.id = ?',
              [id],
              (error, [{ title, description, name }]) => {
                if (error) throw error;

                const contentsList = template.contentsList(topics);
                const controlList = template.controlList(id);
                const contents = template.description({ title, description });
                const html = template.html({
                  title,
                  contentsList,
                  controlList,
                  contents,
                  author: name,
                });

                res.writeHead(200);
                res.end(html);
              }
            );
          } else {
            const title = 'Welcome';
            const description = 'Hello, Node.js';

            const contentsList = template.contentsList(topics);
            const controlList = template.controlList();
            const contents = template.description({ title, description });
            const html = template.html({
              title,
              contentsList,
              controlList,
              contents,
            });

            res.writeHead(200);
            res.end(html);
          }
        });
      } else if (pathName === '/create') {
        database.query('SELECT * FROM topic', (error, topics) => {
          if (error) throw error;

          const contentsList = template.contentsList(topics);
          const contents = template.form({ path: '/create-process' });
          const html = template.html({
            title: 'Web - Create',
            contentsList,
            contents,
          });

          res.writeHead(200);
          res.end(html);
        });
      } else if (pathName === '/update') {
        database.query('SELECT * FROM topic', (error, topics) => {
          if (error) throw error;

          const id = url.searchParams.get('id');

          if (id) {
            database.query(
              'SELECT * FROM topic WHERE id=?',
              [id],
              (error, [{ title, description }]) => {
                if (error) throw error;

                const contentsList = template.contentsList(topics);
                const contents = template.form({
                  path: '/update-process',
                  id,
                  title,
                  description,
                });
                const html = template.html({
                  title: 'Web - Update',
                  contentsList,
                  contents,
                });

                res.writeHead(200);
                res.end(html);
              }
            );
          }
        });
      } else {
        res.writeHead(404);
        res.end('GET: Not Found');
      }
    } else if (req.method === 'POST') {
      if (pathName === '/create-process') {
        let body = '';

        req.on('data', data => {
          body += data;
        });

        req.on('end', () => {
          const { title, description } = qs.parse(body);

          database.query(
            `INSERT INTO topic (title, description, created, author_id) VALUES(?, ?, NOW(), ?)`,
            [title, description, 1],
            (error, results) => {
              if (error) throw error;

              res.writeHead(302, { Location: `/?id=${results.insertId}` });
              res.end();
            }
          );
        });
      } else if (pathName === '/update-process') {
        let body = '';

        req.on('data', data => {
          body += data;
        });

        req.on('end', () => {
          const { id, title, description } = qs.parse(body);

          database.query(
            `UPDATE topic SET title=?, description=?, author_id=1 WHERE id=?`,
            [title, description, id],
            error => {
              if (error) throw error;

              res.writeHead(302, { Location: `/?id=${id}` });
              res.end();
            }
          );
        });
      } else if (pathName === '/delete-process') {
        let body = '';

        req.on('data', data => {
          body += data;
        });

        req.on('end', () => {
          const { id } = qs.parse(body);

          database.query(`DELETE FROM topic WHERE id=?`, [id], error => {
            if (error) throw error;

            res.writeHead(302, { Location: `/` });
            res.end();
          });
        });
      } else {
        res.writeHead(404);
        res.end('POST: Not Found');
      }
    } else {
      res.writeHead(404);
      res.end('Method: Not Found');
    }
  } catch (error) {
    console.error(error);

    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`${BASE_URL} ?????? ?????? ?????? ???...`);
});
