/*
 *
 *
 * Complete the API routing below
 *
 *
 */

"use strict";

const { ObjectId } = require("mongodb");

module.exports = function (app, client) {
  // Use a single database connection for the app
  const db = client.db("issue-tracker");
  const issuesCollection = db.collection("issues");

  app
    .route("/api/issues/:project")

    .get(async function (req, res) {
      let project = req.params.project;
      // The initial filter must always include the project name.
      let filter = { project };

      // Dynamically build the filter object based on query parameters
      for (const key in req.query) {
        if (Object.hasOwnProperty.call(req.query, key)) {
          const value = req.query[key];

          // Skip empty parameters
          if (value === "") continue;

          // --- FIX for Test #6 ---
          // The '_id' field needs special handling because it's stored as an ObjectId,
          // not a string. We must convert it before querying.
          if (key === "_id") {
            if (ObjectId.isValid(value)) {
              filter._id = new ObjectId(value);
            } else {
              // If an invalid _id is provided for filtering, no document can match.
              // We can return an empty array immediately.
              return res.json([]);
            }
          } else if (key === "open") {
            // The 'open' field is a boolean, but query params are strings.
            // Convert 'true'/'false' strings to their boolean equivalents.
            filter.open = value === "true";
          } else {
            // Add any other query parameters to the filter as-is.
            filter[key] = value;
          }
        }
      }

      try {
        // Find all issues that match the constructed filter
        const issues = await issuesCollection.find(filter).toArray();

        // Format the issues for the response as per project requirements
        const formattedIssues = issues.map((issue) => ({
          _id: issue._id.toString(),
          issue_title: issue.issue_title,
          issue_text: issue.issue_text,
          created_on: issue.created_on,
          updated_on: issue.updated_on,
          created_by: issue.created_by,
          assigned_to: issue.assigned_to || "",
          open: issue.open,
          status_text: issue.status_text || "",
        }));

        return res.json(formattedIssues);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "could not retrieve issues" });
      }
    })

    .post(async function (req, res) {
      let project = req.params.project;
      const { issue_title, issue_text, created_by, assigned_to, status_text } =
        req.body;

      // Check for required fields
      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: "required field(s) missing" });
      }

      const now = new Date();
      const newIssue = {
        project: project,
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || "",
        status_text: status_text || "",
        created_on: now,
        updated_on: now,
        open: true,
      };

      try {
        const result = await issuesCollection.insertOne(newIssue);
        // The returned object must include the new _id and other fields
        return res.json({
          _id: result.insertedId.toString(),
          issue_title: newIssue.issue_title,
          issue_text: newIssue.issue_text,
          created_by: newIssue.created_by,
          assigned_to: newIssue.assigned_to,
          status_text: newIssue.status_text,
          created_on: newIssue.created_on,
          updated_on: newIssue.updated_on,
          open: newIssue.open,
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "could not create issue" });
      }
    })

    .put(async function (req, res) {
      let project = req.params.project;
      const { _id, ...updateFields } = req.body;

      if (!_id) {
        return res.json({ error: "missing _id" });
      }

      if (!ObjectId.isValid(_id)) {
        return res.json({ error: "could not update", _id: _id });
      }

      const updateData = {};
      // Filter out empty fields from the request body
      for (const key in updateFields) {
        if (updateFields[key] !== "") {
          updateData[key] = updateFields[key];
        }
      }

      // If there are no fields to update after filtering, return an error
      if (Object.keys(updateData).length === 0) {
        return res.json({ error: "no update field(s) sent", _id: _id });
      }

      // The 'open' field should be a boolean
      if (updateData.hasOwnProperty("open")) {
        updateData.open = updateData.open === "true";
      }

      // Add the updated_on timestamp
      updateData.updated_on = new Date();

      try {
        // --- FIX for Test #7 ---
        // The findOneAndUpdate method's return value depends on the driver version.
        // Using `{ returnOriginal: false }` is a widely compatible way to get the
        // updated document back. The result object contains the document in a 'value' property.
        // We check `result.value` to see if a document was found and updated.
        const result = await issuesCollection.findOneAndUpdate(
          { _id: new ObjectId(_id), project: project },
          { $set: updateData },
          { returnOriginal: false }, // Ensures the updated doc is returned
        );

        if (!result) {
          // If result.value is null, no document matched the _id and project.
          return res.json({ error: "could not update", _id: _id });
        } else {
          // Success
          return res.json({ result: "successfully updated", _id: _id });
        }
      } catch (err) {
        console.error(err);
        return res.json({ error: "could not update", _id: _id });
      }
    })

    .delete(async function (req, res) {
      let project = req.params.project;
      const { _id } = req.body;

      if (!_id) {
        return res.json({ error: "missing _id" });
      }

      if (!ObjectId.isValid(_id)) {
        return res.json({ error: "could not delete", _id: _id });
      }

      try {
        const result = await issuesCollection.deleteOne({
          _id: new ObjectId(_id),
          project: project,
        });

        // If deletedCount is 0, no issue was found with that _id for this project
        if (result.deletedCount === 0) {
          return res.json({ error: "could not delete", _id: _id });
        }

        return res.json({ result: "successfully deleted", _id: _id });
      } catch (err) {
        console.error(err);
        return res.json({ error: "could not delete", _id: _id });
      }
    });
};
