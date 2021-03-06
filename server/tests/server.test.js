const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');
const { app } = require('./../server');
const { Todo } = require('./../models/todo');
const { User } = require('./../models/user');

const { todos, populateTodos, users, populateUsers } = require('./seed/seed');


beforeEach(populateTodos);
beforeEach(populateUsers);

describe('POST /todos', () => {
    it('Should create a new todo', done => {
        const text = 'Test todo text';
        request(app)
            .post('/todos')
            .set('x-auth', users[0].tokens[0].token)
            .send({ text })
            .expect(200)
            .expect((res) => {
                expect(res.body.text).toBe(text);
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                Todo.find({text}).then((todos)=>{
                    expect(todos.length).toBe(1);
                    expect(todos[0].text).toBe(text);
                    done();
                }).catch(e => done(e));
            })
    });

    it('should not create todo with invalid body data', done => {
        const text = '';
        request(app)
            .post('/todos')
            .set('x-auth', users[0].tokens[0].token)
            .send({})
            .expect(400)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                Todo.find().then((todos) => {
                    expect(todos.length).toBe(2);
                    done();
                }).catch(e => done(e));
            })
    });
});

describe('GET /todos', () => {
    it('should get all todos', done => {
        request(app)
            .get('/todos')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect(res => {
                expect(res.body.todos.length).toBe(1);
            })
            .end(done);
    })
});

describe('GET /todos/:id', () => {
    it('should return todo doc', done => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect(res => {
                expect(res.body.todo.text).toBe(todos[0].text);
            })
            .end(done);
    });

    it('should not return todo doc created by other user', done => {
        request(app)
            .get(`/todos/${todos[1]._id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)            
            .end(done);
    });
    
    it('it should return 404 if todo not found', done => {
        const testId = new ObjectID().toHexString();
        request(app)
            .get(`/todos/${testId}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done);
    })

    it('it should return 404 for non-object ids', done => {
        request(app)
         .get('/todos/1234abc')
         .set('x-auth', users[0].tokens[0].token)
         .expect(404)
         .end(done);
    })
});

describe('DELETE /todos/:id', ()=> {
    it('should remove a todo', done => {
       const hexId = todos[1]._id.toHexString();
       request(app)
       .delete(`/todos/${hexId}`)
       .set('x-auth', users[1].tokens[0].token)
       .expect(200)
       .expect(res => {
           expect(res.body.todo._id).toBe(hexId);
       })
       .end((err, res) => {
           if (err) {
               return done(err);
           }
           Todo.findById(hexId).then(todo => {
               expect(todo).toNotExist();
               done();
           }).catch(e => done(e));
       });
    });

    it('should not remove a todo created by other user', done => {
        const hexId = todos[0]._id.toHexString();
        request(app)
        .delete(`/todos/${hexId}`)
        .set('x-auth', users[1].tokens[0].token)
        .expect(404)
        .end((err, res) => {
            if (err) {
                return done(err);
            }
            Todo.findById(hexId).then(todo => {
                expect(todo).toExist();
                done();
            }).catch(e => done(e));
        });
     });

    it('should return 404 if todo not found', done => {
        const hexId = new ObjectID().toHexString();
        request(app)
            .delete(`/todos/${hexId}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done);
    });

    it('should return 404 if object id is invalid', done => {
        request(app)
        .delete('/todos/1234abc')
        .set('x-auth', users[1].tokens[0].token)
        .expect(404)
        .end(done);
    });
});

describe('PATCH /todos:id', () => {
    it('should update the todo', done => {
        // grab id of the first item
        const id = todos[0]._id.toHexString();
        const text = 'First todo has changed';
        request(app)
            .patch(`/todos/${id}`)
            .set('x-auth', users[0].tokens[0].token)
            .send({
             completed: true,
             text
            })
            .expect(200)
            .expect(res => {
                expect(res.body.todo.completed).toBe(true);
                expect(res.body.todo.text).toBe(text);
                expect(res.body.todo.completedAt).toBeA('number');
            })
            .end(done);
        // update text, set completed true
        // 200
        // text is changed, completed is true, completed is number
    });

    it('should not update the todo created by other user', done => {
        // grab id of the first item
        const id = todos[1]._id.toHexString();
        const text = 'First todo has changed';
        request(app)
            .patch(`/todos/${id}`)
            .set('x-auth', users[0].tokens[0].token)
            .send({
             completed: true,
             text
            })
            .expect(404)
            .end(done);
        // update text, set completed true
        // 200
        // text is changed, completed is true, completed is number
    });

    it('should clear completedAt when todo is not completed', done => {
        // grab id of second todo item
        // update text, set completed to false
        // 200
        // text is changed, completed fase, completedAt is null .toNotExist
        const id = todos[1]._id.toHexString();
        const text = 'Second todo has changed';
        request(app)
            .patch(`/todos/${id}`)
            .set('x-auth', users[1].tokens[0].token)
            .send({
             completed: false,
             text
            })
            .expect(200)
            .expect(res => {
                expect(res.body.todo.completed).toBe(false);
                expect(res.body.todo.text).toBe(text);
                expect(res.body.todo.completedAt).toNotExist();
            })
            .end(done);
    });
});
describe('GET /users/me',() => {
    it('should return user if authenticated', done => {
        request(app)
            .get('/users/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect(res => {
                expect(res.body._id).toBe(users[0]._id.toHexString());
                expect(res.body.email).toBe(users[0].email);
            }).end(done);
    });

    it('should return 401 if not authenticated', done => {
        request(app)
            .get('/users/me')
            .set('x-auth', 'asfasdfasdfadsfasdfd')
            .expect(401)
            .expect(res => {
                expect(res.body).toEqual({});
            })
            .end(done);
    })
});

describe('POST /users',() => {
    it('should create a user', done => {
        const email = 'example@gmail.com';
        const password = 'abc12345';
        request(app)
            .post('/users')
            .send({email, password})
            .expect(200)
            .expect(res => {
                expect(res.headers['x-auth']).toExist();
                expect(res.body._id).toExist();
                expect(res.body.email).toBe(email);
            })
            .end(err => {
                if (err) {
                    return done();
                }
                User.findOne({ email }).then(user => {
                    expect(user.email).toBe(email);
                    expect(user.password).toNotBe(password);
                    done();
                });
            });
    });

    it('should return validation errors if request invalid', done => {
        const email = 'thuann89.com';
        const password = 'a123';
        request(app)
            .post('/users')
            .send({ email, password })
            .expect(400)
            .end(done);
    });

    it('should not create user in use', done => {
        request(app)
            .post('/users')
            .send({ 
                email: users[0].email, 
                password: 'Password123!'
            })
            .expect(400)
            .end(done);
    });
});

describe('POST users/login', () => {
    it('should login user and return auth', done => {
        request(app)
            .post('/users/login')
            .send({
                email: users[1].email,
                password: users[1].password
            })
            .expect(200)
            .expect(res => {
                expect(res.headers['x-auth']).toExist();
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                User.findById(users[1]._id).then(user => {
                    expect(user.tokens[1]).toInclude({
                        access: 'auth',
                        token: res.headers['x-auth']
                    });
                    done();
                }).catch(e => done(e));
            })
    });

    it('should reject invalid login', done => {
        request(app)
            .post('/users/login')
            .send({
                email: users[1].email,
                password: users[1].password+'1'
            })
            .expect(400)
            .expect(res => {
                expect(res.headers['x-auth']).toNotExist();
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                User.findById(users[1]._id).then(user => {
                    expect(user.tokens.length).toBe(1);
                    done();
                }).catch(e => done(e));
            })
    });
});

describe('DELETE /users/me/token', () => {
    it('should remove auth token on logout', done => {
        request(app)
            .delete('/users/me/token')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[0]._id).then(user => {
                    expect(user.tokens.length).toBe(0);
                    done();
                }).catch(e => done(e));
            });
    });
});