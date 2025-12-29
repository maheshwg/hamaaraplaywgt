package com.youraitester.dto.app;

import java.util.List;

public class ScreenMethodRequest {
    private String methodName;
    private String methodSignature;
    private String methodBody;
    private String returnHandling;         // ignore | assert | storeVariable
    private List<String> sideEffectFlags;  // navigation/dialog/newPage/etc
    private List<ScreenMethodParamRequest> params;

    public String getMethodName() { return methodName; }
    public void setMethodName(String methodName) { this.methodName = methodName; }
    public String getMethodSignature() { return methodSignature; }
    public void setMethodSignature(String methodSignature) { this.methodSignature = methodSignature; }
    public String getMethodBody() { return methodBody; }
    public void setMethodBody(String methodBody) { this.methodBody = methodBody; }
    public String getReturnHandling() { return returnHandling; }
    public void setReturnHandling(String returnHandling) { this.returnHandling = returnHandling; }
    public List<String> getSideEffectFlags() { return sideEffectFlags; }
    public void setSideEffectFlags(List<String> sideEffectFlags) { this.sideEffectFlags = sideEffectFlags; }
    public List<ScreenMethodParamRequest> getParams() { return params; }
    public void setParams(List<ScreenMethodParamRequest> params) { this.params = params; }
}


