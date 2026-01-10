package com.youraitester.plugin.api;

import com.microsoft.playwright.Page;

import java.util.Set;

/**
 * Minimal contract that a plugin JAR must expose via Java ServiceLoader.
 *
 * Implementations must be listed in:
 *   META-INF/services/com.youraitester.plugin.api.AppPlugin
 *
 * Method-only mode:
 * - Backend maps English steps to call_method (screen::method)
 * - Backend instantiates a screen object and invokes the method via reflection
 */
public interface AppPlugin {
  /**
   * App name this plugin supports (e.g. "saucedemo", "testautomationpractice").
   * Used to validate we loaded the right jar for an App.
   */
  String getAppName();

  /**
   * Known screen names exposed by this plugin (e.g. "login", "products").
   */
  Set<String> getScreenNames();

  /**
   * Returns the screen class for a screen name. The backend will reflect over this class
   * to enumerate public methods for mapping, and to invoke methods at runtime.
   *
   * Recommended: the returned class should have a constructor (Page page).
   */
  Class<?> getScreenClass(String screenName);

  /**
   * Optional factory if you don't want the backend to assume a (Page) constructor.
   * Default implementation returns null, meaning backend will use reflection.
   */
  default Object createScreen(String screenName, Page page) {
    return null;
  }
}


