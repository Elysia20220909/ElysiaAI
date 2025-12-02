import { Elysia } from 'elysia';
const app = new Elysia().get('/', () => 'Hello').listen(3000);
console.log('Running on 3000');
