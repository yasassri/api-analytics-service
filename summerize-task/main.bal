import ballerina/http;
import ballerina/io;

configurable string analyticsApiUrl = ?;

type ResponseRec record {
    string message;
};

public function main() returns error? {

    io:println("Summarize Process Started");
    io:println("Appintment URL: " + analyticsApiUrl);

    http:Client analyticsClient = check new (analyticsApiUrl);


    ResponseRec res = check analyticsClient->/api/v1/summerize;

    io:println("Analytics API Response:" + res.toJsonString());

    io:println("Process Completed");
}
