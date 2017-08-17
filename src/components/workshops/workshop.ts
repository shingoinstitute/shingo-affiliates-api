/**
 * Interface used to help ensure typings
 * 
 * @export
 * @interface Workshop
 */
export interface Workshop {
    Id?: string,
    Name: string,
    Start_Date__c: string,
    End_Date__c: string,
    Organizing_Affiliate__c: string,
    facilitators?: object[],
    Course_Manager__c: string,
    Course_Manager__r: any
}