const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server"); // Onde seu app Express é exportado

chai.use(chaiHttp);

let issueId1; // Para armazenar o ID da issue criada para testes de update/delete
let issueId2; // Para uma segunda issue, se necessário

suite("Functional Tests", function () {
  // --- Adição do suiteSetup para limpeza do DB ---
  this.timeout(5000); // Aumente o timeout para a operação de limpeza, se necessário
  suiteSetup(function (done) {
    chai
      .request(server)
      .delete("/api/issues/testproject") // Usa a sua rota DELETE padrão
      .send({ _id: "deleteAll" }) // Envia a "magic string" para limpar
      .end(function (err, res) {
        if (err) {
          console.error("Error clearing database before tests:", err);
          return done(err);
        }
        console.log("Cleared issues for testproject before running tests.");
        done();
      });
  });
  // --- Fim ---

  suite("POST /api/issues/{project}", function () {
    test("Create an issue with every field: POST request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .post("/api/issues/testproject") // Substitua 'testproject' pelo nome do seu projeto de teste
        .send({
          issue_title: "Test Issue Full",
          issue_text: "This is a test issue with all fields.",
          created_by: "Chai Test",
          assigned_to: "Chai User",
          status_text: "In Progress",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, "issue_title");
          assert.property(res.body, "issue_text");
          assert.property(res.body, "created_by");
          assert.property(res.body, "assigned_to");
          assert.property(res.body, "status_text");
          assert.property(res.body, "created_on");
          assert.property(res.body, "updated_on");
          assert.property(res.body, "open");
          assert.property(res.body, "_id");

          assert.equal(res.body.issue_title, "Test Issue Full");
          assert.equal(
            res.body.issue_text,
            "This is a test issue with all fields.",
          );
          assert.equal(res.body.created_by, "Chai Test");
          assert.equal(res.body.assigned_to, "Chai User");
          assert.equal(res.body.status_text, "In Progress");
          assert.isBoolean(res.body.open);
          assert.isTrue(res.body.open);
          issueId1 = res.body._id; // Salva o ID para testes posteriores
          done();
        });
    });

    test("Create an issue with only required fields: POST request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .post("/api/issues/testproject")
        .send({
          issue_title: "Test Issue Required",
          issue_text: "This is a test issue with only required fields.",
          created_by: "Chai Test Minimal",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, "issue_title");
          assert.property(res.body, "issue_text");
          assert.property(res.body, "created_by");
          assert.property(res.body, "created_on");
          assert.property(res.body, "updated_on");
          assert.property(res.body, "open");
          assert.property(res.body, "_id");
          // Verifica se os campos opcionais são strings vazias
          assert.equal(res.body.assigned_to, "");
          assert.equal(res.body.status_text, "");

          assert.equal(res.body.issue_title, "Test Issue Required");
          assert.equal(
            res.body.issue_text,
            "This is a test issue with only required fields.",
          );
          assert.equal(res.body.created_by, "Chai Test Minimal");
          assert.isBoolean(res.body.open);
          assert.isTrue(res.body.open);
          issueId2 = res.body._id; // Salva um segundo ID, se precisar
          done();
        });
    });

    test("Create an issue with missing required fields: POST request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .post("/api/issues/testproject")
        .send({
          issue_title: "Missing Created By",
          issue_text: "This issue is missing created_by.",
          // created_by is missing
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: "required field(s) missing" });
          done();
        });
    });
  });

  suite("GET /api/issues/{project}", function () {
    test("View issues on a project: GET request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .get("/api/issues/testproject")
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtLeast(res.body.length, 2); // Deve ter pelo menos as duas issues que criamos
          // Verifica se um item da array tem as propriedades esperadas
          assert.property(res.body[0], "_id");
          assert.property(res.body[0], "issue_title");
          assert.property(res.body[0], "issue_text");
          assert.property(res.body[0], "created_by");
          assert.property(res.body[0], "assigned_to");
          assert.property(res.body[0], "status_text");
          assert.property(res.body[0], "created_on");
          assert.property(res.body[0], "updated_on");
          assert.property(res.body[0], "open");
          done();
        });
    });

    test("View issues on a project with one filter: GET request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .get("/api/issues/testproject?open=true") // Filtra por issues abertas
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtLeast(res.body.length, 1);
          res.body.forEach((issue) => {
            assert.isTrue(issue.open);
          });
          done();
        });
    });

    test("View issues on a project with multiple filters: GET request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .get("/api/issues/testproject?open=true&created_by=Chai Test") // Filtra por abertas e created_by
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtLeast(res.body.length, 1);
          res.body.forEach((issue) => {
            assert.isTrue(issue.open);
            assert.equal(issue.created_by, "Chai Test");
          });
          done();
        });
    });
  });

  suite("PUT /api/issues/{project}", function () {
    test("Update one field on an issue: PUT request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .put("/api/issues/testproject")
        .send({ _id: issueId1, issue_text: "Updated issue text." })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          // *** CORREÇÃO AQUI ***
          assert.deepEqual(res.body, {
            result: "successfully updated", // Mudei de 'error' para 'result'
            _id: issueId1,
          });
          done();
        });
    });

    test("Update multiple fields on an issue: PUT request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .put("/api/issues/testproject")
        .send({
          _id: issueId2,
          issue_title: "Updated Title",
          status_text: "Closed",
          open: false, // Altera o status para fechado
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, {
            result: "successfully updated",
            _id: issueId2,
          });
          done();
        });
    });

    test("Update an issue with missing _id: PUT request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .put("/api/issues/testproject")
        .send({ issue_text: "This update will fail." }) // _id está faltando
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: "missing _id" });
          done();
        });
    });

    test("Update an issue with no fields to update: PUT request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .put("/api/issues/testproject")
        .send({ _id: issueId1 }) // Nenhum campo para atualizar além do _id
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, {
            error: "no update field(s) sent",
            _id: issueId1,
          });
          done();
        });
    });

    test("Update an issue with an invalid _id: PUT request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .put("/api/issues/testproject")
        .send({
          _id: "invalidid123",
          issue_text: "Try to update with invalid ID",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, {
            error: "could not update",
            _id: "invalidid123",
          });
          done();
        });
    });
  });

  suite("DELETE /api/issues/{project}", function () {
    test("Delete an issue: DELETE request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .delete("/api/issues/testproject")
        .send({ _id: issueId1 })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, {
            result: "successfully deleted",
            _id: issueId1,
          });
          done();
        });
    });

    test("Delete an issue with an invalid _id: DELETE request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .delete("/api/issues/testproject")
        .send({ _id: "invalidid456" })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, {
            error: "could not delete",
            _id: "invalidid456",
          });
          done();
        });
    });

    test("Delete an issue with missing _id: DELETE request to /api/issues/{project}", function (done) {
      chai
        .request(server)
        .delete("/api/issues/testproject")
        .send({}) // _id está faltando
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, { error: "missing _id" });
          done();
        });
    });
  });
});
