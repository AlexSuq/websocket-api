import { DynamoDB } from "aws-sdk";
import { ApiGatewayManagementApi } from "aws-sdk";
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";

let dynamo: DocumentClient = new DynamoDB.DocumentClient();

const CHAT_TABLE = 'dev-chat';

const successResponse = {
  statusCode: 200,
  body: 'ok'
};

export const onConnection = (event, _context, callback) => {
  console.log(event);
  addConnection(event.requestContext.connectionId)
      .then(() => {
        callback(null, successResponse);
      })
      .catch(err => {
        console.log(err);
        callback(null, JSON.stringify(err));
      });
};

export const onDisconnection = (event, _context, callback) => {
  console.log(event);
  deleteConnection(event.requestContext.connectionId)
      .then(() => {
        callback(null, successResponse);
      })
      .catch(err => {
        console.log(err);
        callback(null, {
          statusCode: 500,
          body: 'Failed to connect: ' + JSON.stringify(err)
        });
      });
};

export const sendMessage = (event, _context, callback) => {
  console.log(event);
  sendMessageToAllConnected(event).then(() => {
    callback(null, successResponse)
  }).catch (err => {
    callback(null, JSON.stringify(err));
  });
}

const sendMessageToAllConnected = (event) => {
  console.log(event);
  return getConnectionIds().
  then(connectionData => {
    return connectionData.Items.map(connectionId => {
      return send(event, connectionId.connectionId);
    });
  });
}

const getConnectionIds = () => {
  const params = {
    TableName: CHAT_TABLE,
    ProjectionExpression: 'connectionId'
  };

  return dynamo.scan(params).promise();
}

const send = (event, connectionId) => {
  const body = JSON.parse(event.body);
  const postData = body.data;

  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  const apigwManagementApi = new ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: endpoint
  });

  const params = {
    ConnectionId: connectionId,
    Data: postData
  };
  return apigwManagementApi.postToConnection(params).promise();
};

const addConnection = connectionId => {
  console.log(connectionId)
  const params = {
    TableName: CHAT_TABLE,
    Item: {
      connectionId: connectionId
    }
  };

  return dynamo.put(params).promise();
};

const deleteConnection = connectionId => {
  const params = {
    TableName: CHAT_TABLE,
    Key: {
      connectionId: connectionId
    }
  };

  return dynamo.delete(params).promise();
};
