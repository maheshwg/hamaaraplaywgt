package com.youraitester.service;

/**
 * Exception type whose message is safe to show to end users in step results.
 * The internal cause can still be logged for debugging.
 */
public class UserFacingStepException extends RuntimeException {
    private final String userMessage;

    public UserFacingStepException(String userMessage) {
        super(userMessage);
        this.userMessage = userMessage;
    }

    public UserFacingStepException(String userMessage, Throwable cause) {
        super(userMessage, cause);
        this.userMessage = userMessage;
    }

    public String getUserMessage() {
        return userMessage;
    }
}


