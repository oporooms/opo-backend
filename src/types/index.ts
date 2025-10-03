export interface GSTDetails {
    gstNo: string;
    gstName: string;
    gstAddress: {
        address: string;
        state: string;
        pincode: string;
    };
}

export interface PanDetails {
    panNo: string;
}

export interface PassportDetails {
    passportNo: string;
    passportExpiry: string;
    passportIssue: string;
}